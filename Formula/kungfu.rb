require "json"

class Kungfu < Formula
  desc "Headless runtime fact ledger and agent-work CLI"
  homepage "https://kungfu.tech"
  version "4.0.0-alpha.1"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/kungfu/releases/download/v4.0.0-alpha.1/kungfu-episodes-cli-darwin-arm64.tar.gz"
    sha256 "360880cc7b0826924d078dc27a97f062a8731029f5a724c9cbe2bfa1d9ca0c09"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/kungfu/releases/download/v4.0.0-alpha.1/kungfu-episodes-cli-linux-x64.tar.gz"
    sha256 "cd8310b8e6a4baf346f5248adf78496bc7e87502a7f2ec8d51bcbb689fef1023"
  else
    odie "Kungfu Homebrew formula currently supports macOS arm64 and Linux x86_64 standalone CLI archives."
  end

  def install
    payload_root = ([buildpath] + buildpath.children.select(&:directory?)).find do |candidate|
      (candidate/"product.json").file? && (candidate/"kungfu").file?
    end
    odie "Kungfu standalone CLI archive layout is invalid." if payload_root.nil?

    libexec.install Dir["#{payload_root}/*"]
    if OS.mac?
      # Keep the relocated executable and its bundled libraries in one local
      # signing domain so macOS library validation can load the runtime.
      mach_o_magics = [0xCAFEBABE, 0xBEBAFECA, 0xFEEDFACE, 0xCEFAEDFE, 0xFEEDFACF, 0xCFFAEDFE]
      Dir["#{libexec}/runtime/**/*"].each do |path|
        next unless File.file?(path)
        next unless mach_o_magics.include?(File.binread(path, 4)&.unpack1("N"))

        system "codesign", "--force", "--sign", "-", path
      end
    end

    manifest_path = libexec/"product.json"
    manifest = JSON.parse(manifest_path.read)
    manifest["install"] = {
      "source"              => "homebrew",
      "frontendAuthority"   => "package-manager",
      "runtimeAuthority"    => "kungfu-core-runtime-upgrade-controller",
      "backgroundUpdater"   => false,
      "managerCommand"      => ["brew", "upgrade", "--formula", "kungfu-systems/tap/kungfu"],
      "verificationCommand" => ["kungfu", "--version"],
    }
    manifest_path.atomic_write(JSON.pretty_generate(manifest) + "\n")
    bin.install_symlink libexec/"kungfu"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/kungfu --version")
    assert_match "usage:", shell_output("#{bin}/kungfu --help")
    assert_match '"source": "homebrew"', shell_output("#{bin}/kungfu update status --json")
    assert_match "Usage", shell_output("#{bin}/kungfu run agent --help")
  end
end
